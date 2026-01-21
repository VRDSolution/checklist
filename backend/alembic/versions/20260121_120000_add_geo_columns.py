"""add geolocation columns to checkins

Revision ID: 20260121_120000_add_geo_columns
Revises: add_performance_indexes
Create Date: 2026-01-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260121_120000_add_geo_columns'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns for geolocation
    op.add_column('checkins', sa.Column('start_lat', sa.String(length=50), nullable=True))
    op.add_column('checkins', sa.Column('start_lon', sa.String(length=50), nullable=True))
    op.add_column('checkins', sa.Column('end_lat', sa.String(length=50), nullable=True))
    op.add_column('checkins', sa.Column('end_lon', sa.String(length=50), nullable=True))
    op.add_column('checkins', sa.Column('is_auto_checkout', sa.Integer(), server_default='0', nullable=True))


def downgrade():
    op.drop_column('checkins', 'is_auto_checkout')
    op.drop_column('checkins', 'end_lon')
    op.drop_column('checkins', 'end_lat')
    op.drop_column('checkins', 'start_lon')
    op.drop_column('checkins', 'start_lat')
