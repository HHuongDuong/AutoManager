-- Persist the selected branch on each attendance record so check-in/out
-- follows the branch chosen in the client instead of the employee profile branch.

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

UPDATE attendance a
SET branch_id = e.branch_id
FROM employees e
WHERE a.employee_id = e.id
  AND a.branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_branch_id_check_in
ON attendance(branch_id, check_in DESC);
