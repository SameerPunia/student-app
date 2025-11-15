
-- Create ai_tutor_logs table for tracking AI interactions
CREATE TABLE IF NOT EXISTS public.ai_tutor_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question TEXT,
    response TEXT,
    file_url TEXT,
    summary TEXT,
    key_points TEXT[],
    quiz JSONB,
    type TEXT CHECK (type IN ('question', 'document')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ai_tutor_logs_user_id_idx ON public.ai_tutor_logs(user_id);
CREATE INDEX IF NOT EXISTS ai_tutor_logs_created_at_idx ON public.ai_tutor_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_tutor_logs_type_idx ON public.ai_tutor_logs(type);

-- Enable Row Level Security
ALTER TABLE public.ai_tutor_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI tutor logs"
    ON public.ai_tutor_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI tutor logs"
    ON public.ai_tutor_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI tutor logs"
    ON public.ai_tutor_logs
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI tutor logs"
    ON public.ai_tutor_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ai_tutor_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.ai_tutor_logs IS 'Stores AI tutor interaction logs for analytics and history';
COMMENT ON COLUMN public.ai_tutor_logs.question IS 'The question asked by the user';
COMMENT ON COLUMN public.ai_tutor_logs.response IS 'The AI response to the question';
COMMENT ON COLUMN public.ai_tutor_logs.file_url IS 'URL of uploaded document if applicable';
COMMENT ON COLUMN public.ai_tutor_logs.summary IS 'Summary of uploaded document';
COMMENT ON COLUMN public.ai_tutor_logs.key_points IS 'Array of key points from document';
COMMENT ON COLUMN public.ai_tutor_logs.quiz IS 'Generated quiz questions in JSON format';
COMMENT ON COLUMN public.ai_tutor_logs.type IS 'Type of interaction: question or document';
