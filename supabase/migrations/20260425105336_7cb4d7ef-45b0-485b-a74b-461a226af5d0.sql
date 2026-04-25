-- Cria super admin manualmente
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'agenciaadsbr@gmail.com';
  v_password text := 'AdsBr@12345!ct';
BEGIN
  -- Se já existe, apenas garante role admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;

  -- Garante profile
  INSERT INTO public.profiles (id, email, nome)
  VALUES (v_user_id, v_email, 'Super Admin')
  ON CONFLICT (id) DO UPDATE SET nome = COALESCE(public.profiles.nome, 'Super Admin');

  -- Garante role admin (e remove outras roles para não duplicar)
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
END $$;