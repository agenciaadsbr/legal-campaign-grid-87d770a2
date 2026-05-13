-- Create project_notes table
CREATE TABLE public.project_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Geral',
    priority TEXT DEFAULT 'Média',
    pinned BOOLEAN DEFAULT FALSE,
    author_id UUID REFERENCES auth.users(id),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Enable read access for all users" ON public.project_notes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.project_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.project_notes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.project_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if trigger exists before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_notes_updated_at') THEN
        CREATE TRIGGER update_project_notes_updated_at
            BEFORE UPDATE ON public.project_notes
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Create function to log project notes activity
CREATE OR REPLACE FUNCTION public.log_project_note_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    v_usuario_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao)
        VALUES (NEW.client_id, 'Observação', 'Criou observação', NEW.id, v_usuario_id, 'Adicionou observação geral: "' || NEW.title || '"');
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.archived = FALSE AND NEW.archived = TRUE) THEN
            INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao)
            VALUES (NEW.client_id, 'Observação', 'Arquivou observação', NEW.id, v_usuario_id, 'Arquivou observação: "' || NEW.title || '"');
        ELSE
            INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao)
            VALUES (NEW.client_id, 'Observação', 'Editou observação', NEW.id, v_usuario_id, 'Editou observação: "' || NEW.title || '"');
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao)
        VALUES (OLD.client_id, 'Observação', 'Excluiu observação', OLD.id, v_usuario_id, 'Excluiu observação: "' || OLD.title || '"');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for activity logging
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_notes_activity_trigger') THEN
        CREATE TRIGGER project_notes_activity_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.project_notes
            FOR EACH ROW EXECUTE FUNCTION public.log_project_note_activity();
    END IF;
END $$;
