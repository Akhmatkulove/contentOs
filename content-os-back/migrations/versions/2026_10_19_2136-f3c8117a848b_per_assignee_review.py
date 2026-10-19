"""per assignee review

Revision ID: f3c8117a848b
Revises: 38c4c0aac9fd
Create Date: 2026-10-19 21:36:49.850100

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3c8117a848b"
down_revision: str | Sequence[str] | None = "38c4c0aac9fd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Свой статус у каждого исполнителя (docs/adr/0015).
    op.add_column(
        "shoot_deliverable_assignees",
        sa.Column(
            "status",
            sa.Enum(
                "to_shoot",
                "in_progress",
                "needs_review",
                "needs_changes",
                "approved",
                name="shoot_deliverable_assignee_status",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
            server_default="to_shoot",
        ),
    )
    op.alter_column("shoot_deliverable_assignees", "status", server_default=None)
    op.add_column(
        "task_versions",
        sa.Column(
            "review",
            sa.Enum(
                "approved",
                "changes_requested",
                name="version_review",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=True,
        ),
    )
    op.add_column(
        "task_versions", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("task_versions", sa.Column("feedback", sa.Text(), nullable=True))
    # Нумерация версий — у каждого исполнителя своя; старые номера уникальны и так.
    op.drop_index(op.f("ix_task_versions_deliverable_id"), table_name="task_versions")
    op.drop_constraint(
        op.f("uq_task_versions_deliverable_id_number"), "task_versions", type_="unique"
    )
    op.create_unique_constraint(
        op.f("uq_task_versions_deliverable_id_author_id_number"),
        "task_versions",
        ["deliverable_id", "author_id", "number"],
    )

    # Статус исполнителя из его версий и статуса deliverable: кто отправлял —
    # на проверке (или уже решено по deliverable), у кого черновик — в работе.
    op.execute(
        """
        UPDATE shoot_deliverable_assignees AS a
        SET status = CASE
            WHEN EXISTS (
                SELECT 1 FROM task_versions v
                WHERE v.deliverable_id = a.deliverable_id AND v.author_id = a.user_id
                  AND v.submitted_at IS NOT NULL
            ) THEN CASE WHEN d.status IN ('needs_changes', 'approved') THEN d.status
                        ELSE 'needs_review' END
            WHEN EXISTS (
                SELECT 1 FROM task_versions v
                WHERE v.deliverable_id = a.deliverable_id AND v.author_id = a.user_id
            ) THEN 'in_progress'
            ELSE 'to_shoot'
        END
        FROM shoot_deliverables AS d
        WHERE d.id = a.deliverable_id
        """
    )
    # Последняя отправленная версия получает решение, которое уже стоит на deliverable.
    op.execute(
        """
        UPDATE task_versions AS v
        SET review = CASE d.status WHEN 'approved' THEN 'approved'
                                   ELSE 'changes_requested' END,
            reviewed_at = now()
        FROM shoot_deliverables AS d
        WHERE d.id = v.deliverable_id
          AND d.status IN ('approved', 'needs_changes')
          AND v.number = (
              SELECT max(last.number) FROM task_versions last
              WHERE last.deliverable_id = v.deliverable_id AND last.author_id = v.author_id
                AND last.submitted_at IS NOT NULL
          )
        """
    )

    # Статус начатых deliverables — из статусов исполнителей, как теперь считает
    # app.shoots.statuses.combined_status; отправленные (approved) не трогаем.
    op.execute(
        """
        UPDATE shoot_deliverables AS d
        SET status = combined.status
        FROM (
            SELECT deliverable_id, CASE
                WHEN bool_or(status = 'needs_review') THEN 'needs_review'
                WHEN bool_or(status = 'needs_changes') THEN 'needs_changes'
                WHEN bool_and(status = 'approved') THEN 'needs_review'
                ELSE 'in_progress'
            END AS status
            FROM shoot_deliverable_assignees
            GROUP BY deliverable_id
            HAVING bool_or(status <> 'to_shoot')
        ) AS combined
        WHERE combined.deliverable_id = d.id AND d.status <> 'approved'
        """
    )


def downgrade() -> None:
    # Ключ снимается до перенумерации: UPDATE проверяет уникальность построчно.
    op.drop_constraint(
        op.f("uq_task_versions_deliverable_id_author_id_number"), "task_versions", type_="unique"
    )
    # Общая нумерация внутри deliverable: по времени создания. Черновики разных
    # исполнителей остаются как есть: старый код берёт первый из них.
    op.execute(
        """
        UPDATE task_versions AS v
        SET number = ordered.number
        FROM (
            SELECT id, row_number() OVER (
                PARTITION BY deliverable_id ORDER BY created_at, id
            ) AS number
            FROM task_versions
        ) AS ordered
        WHERE ordered.id = v.id
        """
    )
    op.create_unique_constraint(
        op.f("uq_task_versions_deliverable_id_number"),
        "task_versions",
        ["deliverable_id", "number"],
    )
    op.create_index(
        op.f("ix_task_versions_deliverable_id"), "task_versions", ["deliverable_id"], unique=False
    )
    op.drop_column("task_versions", "feedback")
    op.drop_column("task_versions", "reviewed_at")
    op.drop_column("task_versions", "review")
    op.drop_column("shoot_deliverable_assignees", "status")
