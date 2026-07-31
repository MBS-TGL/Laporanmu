-- RPC: verify_raport
-- SECURITY DEFINER agar bisa bypass RLS saat diakses publik (unauthenticated)
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION verify_raport(p_student_id UUID, p_month INT, p_year INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student JSON;
  v_report JSON;
BEGIN
  -- 1. Ambil data siswa + kelas
  SELECT row_to_json(s.*) INTO v_student
  FROM (
    SELECT st.*, row_to_json(cl.*) as classes
    FROM students st
    LEFT JOIN classes cl ON cl.id = st.class_id
    WHERE st.id = p_student_id
      AND st.deleted_at IS NULL
  ) s;

  IF v_student IS NULL THEN
    RETURN json_build_object('error', 'Data siswa tidak ditemukan!');
  END IF;

  -- 2. Ambil laporan bulanan
  SELECT row_to_json(r.*) INTO v_report
  FROM student_monthly_reports r
  WHERE r.student_id = p_student_id
    AND r.month = p_month
    AND r.year = p_year
  LIMIT 1;

  IF v_report IS NULL THEN
    RETURN json_build_object('error', 'Data laporan bulanan raport tidak ditemukan!');
  END IF;

  -- 3. Return success
  RETURN json_build_object(
    'student', v_student,
    'report', v_report
  );
END;
$$;

-- Beri akses execute ke anon (publik)
GRANT EXECUTE ON FUNCTION verify_raport(UUID, INT, INT) TO anon;
