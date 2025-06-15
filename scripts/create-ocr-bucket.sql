-- Create bucket for temporary OCR uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-uploads', 'ocr-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for OCR uploads bucket
CREATE POLICY "Users can upload their own OCR images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ocr-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own OCR uploads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ocr-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own OCR uploads" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'ocr-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);