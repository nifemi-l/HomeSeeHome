"""
PROLOGUE
File name: db_commands.py
Description: Handles database connectivity and defines functions for inserting, updating, and retrieving data from the PostgreSQL database.
Programmers: Blake Carlson, Logan Smith, some by Jack Bauer
Creation date: 2/22/26
Revision date: 
    - 3/19/26: Added create_household, make_household_join_code, add_account_to_household, get_household_by_join_code, is_account_in_household, and get_households_for_account
    - 4/10/26: Added get_account_role_in_household, remove_account_from_household, get_members_for_household, and transfer_admin_in_household
    - 4/16/26: Add 3D scale, rotation support
    - 4/20/26: Add method to clear feature position data
Preconditions: Environment variables for database credentials are defined in .env; PostgreSQL database is running and accessible.
Postconditions: A database connection is established and utility functions are available for performing CRUD operations on Household, Account, Feature, and Task relations.
Errors: Database connection may fail due to invalid credentials, unreachable host, or server-side errors; SQL execution errors may occur if schema constraints are violated.
Side effects: Opens a persistent database connection; commits transactions for insert/update operations; prints connection status to stdout.
Invariants: SQL statements use parameterized queries to prevent injection.
Known faults: Uses a single global database connection which may not scale for concurrent production environments.
"""

from datetime import datetime, timezone
import random
import string

import psycopg2

from db.connection import connect_to_db as _connect_to_db
from db.connection import get_conn


def connect_to_db():
    """Return a standalone PostgreSQL connection for maintenance scripts."""
    try:
        conn = _connect_to_db()
        print("DB connection successful")
        return conn
    except Exception as exc:
        print(f"DB connection failure: {exc}")
        return None


_FEATURE_ROOM_ID_UNSET = object()
_ROOM_FIELD_UNSET = object()


def _run_read(query_fn):
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            return query_fn(cursor)
    except Exception:
        conn.rollback()
        raise


def _run_write(query_fn):
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            result = query_fn(cursor)
        return result
    except Exception:
        conn.rollback()
        raise


def _fetchone(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchone()


def _fetchall(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchall()


def _execute(cursor, query, params=()):
    cursor.execute(query, params)


def add_household(household_name):
    def query(cursor):
        _execute(
            cursor,
            """
            INSERT INTO Household (household_name)
            VALUES (%s)
            RETURNING household_id
            """,
            (household_name,),
        )
        return cursor.fetchone()[0]

    return _run_write(query)


def add_account(account_name: str, hashed_password: str, email: str):
    def query(cursor):
        _execute(
            cursor,
            """
            INSERT INTO Account (account_name, hashed_password, email)
            VALUES (%s, %s, %s)
            RETURNING account_id
            """,
            (account_name, hashed_password, email),
        )
        return cursor.fetchone()[0]

    return _run_write(query)


def add_feature(household_id, feature_name, feature_type, x_pos=None, y_pos=None, z_pos=None, icon="home-outline", room_id=None):
    def query(cursor):
        _execute(
            cursor,
            """
            INSERT INTO Feature (household_id, feature_name, feature_type, x_pos, y_pos, z_pos, icon, room_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING feature_id
            """,
            (household_id, feature_name, feature_type, x_pos, y_pos, z_pos, icon, room_id),
        )
        return cursor.fetchone()[0]

    return _run_write(query)


def add_room(household_id, room_name, accent_color=None):
    name = (room_name or "").strip()
    if not name:
        raise ValueError("room_name is required")

    def query(cursor):
        _execute(
            cursor,
            """
            INSERT INTO Room (household_id, room_name, accent_color)
            VALUES (%s, %s, %s)
            RETURNING room_id
            """,
            (household_id, name, accent_color),
        )
        return cursor.fetchone()[0]

    return _run_write(query)


def get_room_by_id(room_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT room_id, household_id, room_name, accent_color
            FROM Room
            WHERE room_id = %s
            """,
            (room_id,),
        )
    )


def get_rooms_for_household(household_id):
    rows = _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT room_id, household_id, room_name, accent_color
            FROM Room
            WHERE household_id = %s
            ORDER BY room_id ASC
            """,
            (household_id,),
        )
    )
    return [
        {
            "room_id": row[0],
            "household_id": row[1],
            "room_name": row[2],
            "accent_color": row[3],
        }
        for row in rows
    ]


def update_room(room_id, room_name=_ROOM_FIELD_UNSET, accent_color=_ROOM_FIELD_UNSET):
    sets = []
    params = []
    if room_name is not _ROOM_FIELD_UNSET:
        sets.append("room_name = %s")
        params.append((room_name or "").strip() or "Room")
    if accent_color is not _ROOM_FIELD_UNSET:
        sets.append("accent_color = %s")
        params.append(accent_color)
    if not sets:
        return
    params.append(room_id)

    return _run_write(
        lambda cursor: _execute(cursor, f"UPDATE Room SET {', '.join(sets)} WHERE room_id = %s", tuple(params))
    )


def delete_room(room_id):
    return _run_write(
        lambda cursor: _execute(cursor, "DELETE FROM Room WHERE room_id = %s", (room_id,))
    )


def add_task(feature_id, task_name, frequency_days, last_completed, visibility, created_by_account_id, icon="clipboard-text-outline"):
    def query(cursor):
        _execute(
            cursor,
            """
            INSERT INTO Task (feature_id, task_name, frequency_days, last_completed, visibility, created_by_account_id, icon)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING task_id
            """,
            (feature_id, task_name, frequency_days, last_completed, visibility, created_by_account_id, icon),
        )
        return cursor.fetchone()[0]

    return _run_write(query)


def add_account_role(account_id, household_id, role):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            INSERT INTO HouseholdMember (account_id, household_id, role)
            VALUES (%s, %s, %s)
            """,
            (account_id, household_id, role),
        )
    )


def make_household_join_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))


def create_household(household_name, creator_account_id=None):
    while True:
        join_code = make_household_join_code(8)

        def query(cursor):
            _execute(
                cursor,
                """
                INSERT INTO Household (household_name, join_code, created_by_account_id)
                VALUES (%s, %s, %s)
                RETURNING household_id, household_name, join_code, created_by_account_id, created_at, updated_at
                """,
                (household_name, join_code, creator_account_id),
            )
            return cursor.fetchone()

        try:
            row = _run_write(query)
            break
        except psycopg2.errors.UniqueViolation:
            continue

    return {
        "household_id": row[0],
        "household_name": row[1],
        "join_code": row[2],
        "created_by_account_id": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


def add_account_to_household(account_id, household_id, role):
    add_account_role(account_id, household_id, role)


def get_household_by_join_code(join_code):
    row = _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT household_id, household_name, join_code, created_by_account_id, created_at, updated_at
            FROM Household
            WHERE join_code = %s
            """,
            (join_code,),
        )
    )
    if not row:
        return None
    return {
        "household_id": row[0],
        "household_name": row[1],
        "join_code": row[2],
        "created_by_account_id": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


def is_account_in_household(account_id, household_id):
    result = _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT 1 FROM HouseholdMember
            WHERE account_id = %s AND household_id = %s
            """,
            (account_id, household_id),
        )
    )
    return bool(result)


def get_account_role_in_household(account_id, household_id):
    row = _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT role FROM HouseholdMember
            WHERE account_id = %s AND household_id = %s
            """,
            (account_id, household_id),
        )
    )
    return row[0] if row else None


def remove_account_from_household(account_id, household_id):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            DELETE FROM HouseholdMember
            WHERE account_id = %s AND household_id = %s
            """,
            (account_id, household_id),
        )
    )


def transfer_admin_in_household(new_admin_account_id, household_id):
    def query(cursor):
        _execute(
            cursor,
            """
            UPDATE HouseholdMember SET role = 'member'
            WHERE household_id = %s AND role = 'admin'
            """,
            (household_id,),
        )
        _execute(
            cursor,
            """
            UPDATE HouseholdMember SET role = 'admin'
            WHERE account_id = %s AND household_id = %s
            """,
            (new_admin_account_id, household_id),
        )

    return _run_write(query)


def get_members_for_household(household_id):
    rows = _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT a.account_id, a.account_name, hm.role, hm.joined_at
            FROM HouseholdMember hm
            JOIN Account a ON hm.account_id = a.account_id
            WHERE hm.household_id = %s
            ORDER BY
                CASE WHEN hm.role = 'admin' THEN 0 ELSE 1 END,
                hm.joined_at ASC
            """,
            (household_id,),
        )
    )
    return [
        {
            "account_id": row[0],
            "account_name": row[1],
            "role": row[2],
            "joined_at": row[3].isoformat() if row[3] else None,
        }
        for row in rows
    ]


def get_household_id_for_task(task_id):
    row = _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT f.household_id
            FROM Task t
            JOIN Feature f ON t.feature_id = f.feature_id
            WHERE t.task_id = %s
            """,
            (task_id,),
        )
    )
    return row[0] if row else None


def get_households_for_account(account_id):
    rows = _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT
                h.household_id,
                h.household_name,
                h.join_code,
                hm_current.role,
                admin_account.account_name,
                h.created_at,
                h.updated_at
            FROM Household AS h
            JOIN HouseholdMember AS hm_current
                ON h.household_id = hm_current.household_id
            LEFT JOIN HouseholdMember AS hm_admin
                ON h.household_id = hm_admin.household_id AND hm_admin.role = 'admin'
            LEFT JOIN Account AS admin_account
                ON hm_admin.account_id = admin_account.account_id
            WHERE hm_current.account_id = %s
            ORDER BY h.household_id
            """,
            (account_id,),
        )
    )

    households = []
    for row in rows:
        households.append(
            {
                "household_id": row[0],
                "household_name": row[1],
                "join_code": row[2],
                "role": row[3],
                "admin_name": row[4],
                "created_at": row[5],
                "updated_at": row[6],
            }
        )
    return households


def get_household_by_id(household_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT * FROM Household
            WHERE household_id = %s
            """,
            (household_id,),
        )
    )


def get_account_by_id(account_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT * FROM Account
            WHERE account_id = %s
            """,
            (account_id,),
        )
    )


def get_account_by_email(email: str):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT account_id, account_name, hashed_password, email
            FROM Account
            WHERE email = %s
            """,
            (email,),
        )
    )


def get_feature_by_id(feature_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT * FROM Feature
            WHERE feature_id = %s
            """,
            (feature_id,),
        )
    )


def get_task_by_id(task_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT * FROM Task
            WHERE task_id = %s
            """,
            (task_id,),
        )
    )


def get_tasks_by_feature_id(feature_id):
    return _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT * FROM Task
            WHERE feature_id = %s
            """,
            (feature_id,),
        )
    )


def get_account_roles_by_account_id(account_id):
    return _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT household_id, role
            FROM HouseholdMember
            WHERE account_id = %s
            """,
            (account_id,),
        )
    )


def get_account_roles_by_household_id(household_id):
    return _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT account_id, role
            FROM HouseholdMember
            WHERE household_id = %s
            """,
            (household_id,),
        )
    )


def get_household_features(household_id):
    return _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT * FROM Feature
            WHERE household_id = %s
            """,
            (household_id,),
        )
    )


def get_household_tasks(household_id):
    return _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT *
            FROM Task
            JOIN Feature ON Task.feature_id = Feature.feature_id
            WHERE Feature.household_id = %s
            """,
            (household_id,),
        )
    )


def get_features_with_tasks(household_id):
    features = _run_read(
        lambda cursor: _fetchall(
            cursor,
            """
            SELECT feature_id, household_id, feature_name, feature_type,
                   x_pos, y_pos, z_pos, icon, room_id, scale, rotation_y
            FROM Feature
            WHERE household_id = %s
            ORDER BY feature_id ASC
            """,
            (household_id,),
        )
    )
    result = []
    for feature in features:
        feature_dict = {
            "feature_id": feature[0],
            "household_id": feature[1],
            "feature_name": feature[2],
            "feature_type": feature[3],
            "x_pos": feature[4],
            "y_pos": feature[5],
            "z_pos": feature[6],
            "icon": feature[7] or "home-outline",
            "room_id": feature[8],
            "scale": feature[9],
            "rotation_y": feature[10],
            "tasks": [],
        }
        for task in get_tasks_by_feature_id(feature[0]):
            feature_dict["tasks"].append(
                {
                    "task_id": task[0],
                    "feature_id": task[1],
                    "task_name": task[2],
                    "frequency_days": task[3],
                    "last_completed": task[4].isoformat() if task[4] else None,
                    "visibility": task[5],
                    "created_by_account_id": task[6],
                    "icon": task[7] if len(task) > 7 else "clipboard-text-outline",
                }
            )
        result.append(feature_dict)
    return result


def get_latest_env_data(household_id):
    return _run_read(
        lambda cursor: _fetchone(
            cursor,
            """
            SELECT temperature_C, relative_humidity, recorded_at
            FROM EnvironmentalData
            WHERE household_id = %s
            ORDER BY recorded_at DESC
            LIMIT 1
            """,
            (household_id,),
        )
    )


def delete_old_env_data_by_household_id(household_id):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            DELETE FROM EnvironmentalData
            WHERE household_id = %s
            AND recorded_at < NOW() - INTERVAL '1 day';)
            """,
            (household_id,),
        )
    )


def update_task_last_comp_time(task_id):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            UPDATE Task
            SET last_completed = %s
            WHERE task_id = %s
            """,
            (datetime.now(timezone.utc), task_id),
        )
    )


def update_account_last_login(account_id: int):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            UPDATE Account
            SET last_login = %s
            WHERE account_id = %s
            """,
            (datetime.now(timezone.utc), account_id),
        )
    )


def update_feature(
    feature_id,
    feature_name=None,
    feature_type=None,
    x_pos=None,
    y_pos=None,
    z_pos=None,
    icon=None,
    room_id=_FEATURE_ROOM_ID_UNSET,
    scale=None,
    rotation_y=None,
):
    sets = []
    params = []
    if feature_name is not None:
        sets.append("feature_name = %s")
        params.append(feature_name)
    if feature_type is not None:
        sets.append("feature_type = %s")
        params.append(feature_type)
    if x_pos is not None:
        sets.append("x_pos = %s")
        params.append(x_pos)
    if y_pos is not None:
        sets.append("y_pos = %s")
        params.append(y_pos)
    if z_pos is not None:
        sets.append("z_pos = %s")
        params.append(z_pos)
    if icon is not None:
        sets.append("icon = %s")
        params.append(icon)
    if room_id is not _FEATURE_ROOM_ID_UNSET:
        sets.append("room_id = %s")
        params.append(room_id)
    if scale is not None:
        sets.append("scale = %s")
        params.append(scale)
    if rotation_y is not None:
        sets.append("rotation_y = %s")
        params.append(rotation_y)
    if not sets:
        return
    params.append(feature_id)

    return _run_write(
        lambda cursor: _execute(
            cursor,
            f"UPDATE Feature SET {', '.join(sets)} WHERE feature_id = %s",
            tuple(params),
        )
    )


def set_null_feature_position(feature_id):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            UPDATE Feature
            SET x_pos = %s, y_pos = %s, z_pos = %s
            WHERE feature_id = %s
            """,
            (None, None, None, feature_id),
        )
    )


def delete_task(task_id):
    return _run_write(
        lambda cursor: _execute(cursor, "DELETE FROM Task WHERE task_id = %s", (task_id,))
    )


def delete_feature(feature_id):
    return _run_write(
        lambda cursor: _execute(cursor, "DELETE FROM Feature WHERE feature_id = %s", (feature_id,))
    )


def delete_household(household_id):
    return _run_write(
        lambda cursor: _execute(cursor, "DELETE FROM Household WHERE household_id = %s", (household_id,))
    )


def delete_account(account_id):
    return _run_write(
        lambda cursor: _execute(cursor, "DELETE FROM Account WHERE account_id = %s", (account_id,))
    )


def update_household(household_id, household_name):
    row = _run_write(
        lambda cursor: _fetchone(
            cursor,
            """
            UPDATE Household
            SET household_name = %s, updated_at = NOW()
            WHERE household_id = %s
            RETURNING household_id, household_name, join_code, updated_at
            """,
            (household_name, household_id),
        )
    )
    if not row:
        return None
    return {
        "household_id": row[0],
        "household_name": row[1],
        "join_code": row[2],
        "updated_at": row[3],
    }


def regenerate_join_code(household_id):
    while True:
        new_code = make_household_join_code(8)
        try:
            row = _run_write(
                lambda cursor: _fetchone(
                    cursor,
                    """
                    UPDATE Household
                    SET join_code = %s, updated_at = NOW()
                    WHERE household_id = %s
                    RETURNING household_id, household_name, join_code, updated_at
                    """,
                    (new_code, household_id),
                )
            )
            break
        except psycopg2.errors.UniqueViolation:
            continue
    return {
        "household_id": row[0],
        "household_name": row[1],
        "join_code": row[2],
        "updated_at": row[3],
    }


def update_task(task_id, task_name, frequency_days, visibility, icon=None):
    if icon is not None:
        return _run_write(
            lambda cursor: _execute(
                cursor,
                """
                UPDATE Task
                SET task_name = %s, frequency_days = %s, visibility = %s, icon = %s
                WHERE task_id = %s
                """,
                (task_name, frequency_days, visibility, icon, task_id),
            )
        )
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            UPDATE Task
            SET task_name = %s, frequency_days = %s, visibility = %s
            WHERE task_id = %s
            """,
            (task_name, frequency_days, visibility, task_id),
        )
    )


def update_account(account_id, account_name, email):
    return _run_write(
        lambda cursor: _execute(
            cursor,
            """
            UPDATE Account
            SET account_name = %s, email = %s
            WHERE account_id = %s
            """,
            (account_name, email, account_id),
        )
    )
