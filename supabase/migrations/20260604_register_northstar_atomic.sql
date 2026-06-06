CREATE OR REPLACE FUNCTION register_northstar(
  p_user_id          UUID,
  p_section_id       UUID,
  p_round_id         UUID,
  p_northstar_type_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round_open        BOOLEAN;
  v_quota_id          UUID;
  v_quota             INT;
  v_used_count        INT;
  v_existing_id       UUID;
  v_existing_quota_id UUID;
BEGIN
  SELECT is_open INTO v_round_open
  FROM rounds
  WHERE id = p_round_id
  FOR SHARE;

  IF NOT FOUND OR NOT v_round_open THEN
    RETURN json_build_object(
      'error', 'round not open',
      'status', 400
    );
  END IF;

  SELECT id, quota INTO v_quota_id, v_quota
  FROM round_section_quotas
  WHERE round_id         = p_round_id
    AND section_id        = p_section_id
    AND northstar_type_id = p_northstar_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', 'quota not found',
      'status', 400
    );
  END IF;

  SELECT id, round_section_quota_id INTO v_existing_id, v_existing_quota_id
  FROM registrations
  WHERE user_id = p_user_id;

  IF v_existing_id IS NOT NULL AND v_existing_quota_id = v_quota_id THEN
    RETURN json_build_object('success', true, 'action', 'updated', 'status', 200);
  END IF;

  SELECT COUNT(*) INTO v_used_count
  FROM registrations
  WHERE round_section_quota_id = v_quota_id;

  IF v_used_count >= v_quota THEN
    RETURN json_build_object(
      'error', 'quota full',
      'status', 400
    );
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE registrations
    SET round_section_quota_id = v_quota_id
    WHERE id = v_existing_id;
    RETURN json_build_object('success', true, 'action', 'updated', 'status', 200);
  ELSE
    INSERT INTO registrations (user_id, round_section_quota_id)
    VALUES (p_user_id, v_quota_id);
    RETURN json_build_object('success', true, 'action', 'created', 'status', 201);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION register_northstar(UUID, UUID, UUID, UUID) TO service_role;