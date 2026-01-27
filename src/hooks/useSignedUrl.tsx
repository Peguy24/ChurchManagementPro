import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type BucketName = "member-photos" | "inventory-photos" | "member-documents";

interface UseSignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

/**
 * Hook to get a signed URL for a private storage file.
 * Handles both full URLs and file paths.
 * 
 * @param storedUrl - The stored URL or file path from the database
 * @param bucket - The storage bucket name
 * @param options - Optional configuration
 * @returns { signedUrl, isLoading, error }
 */
export function useSignedUrl(
  storedUrl: string | null | undefined,
  bucket: BucketName,
  options: UseSignedUrlOptions = {}
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { expiresIn = 3600 } = options;

  useEffect(() => {
    if (!storedUrl) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Extract file path from URL if it's a full URL
        let filePath = storedUrl;
        
        // Handle full Supabase storage URLs
        const bucketPattern = new RegExp(`/${bucket}/`);
        if (storedUrl.includes(`/${bucket}/`)) {
          const parts = storedUrl.split(bucketPattern);
          if (parts.length > 1) {
            filePath = parts[1];
          }
        }
        
        // Remove any query parameters
        filePath = filePath.split('?')[0];

        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signError) {
          throw signError;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error(`Error creating signed URL for ${bucket}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to create signed URL'));
        // Fall back to stored URL if signing fails (for backwards compatibility)
        setSignedUrl(storedUrl);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [storedUrl, bucket, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Utility function to get a signed URL (for use in non-React contexts like PDF generation)
 * 
 * @param storedUrl - The stored URL or file path from the database
 * @param bucket - The storage bucket name
 * @param expiresIn - Expiration time in seconds (default 3600)
 * @returns Promise<string | null> - The signed URL or null
 */
export async function getSignedUrl(
  storedUrl: string | null | undefined,
  bucket: BucketName,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!storedUrl) return null;

  try {
    // Extract file path from URL if it's a full URL
    let filePath = storedUrl;
    
    const bucketPattern = new RegExp(`/${bucket}/`);
    if (storedUrl.includes(`/${bucket}/`)) {
      const parts = storedUrl.split(bucketPattern);
      if (parts.length > 1) {
        filePath = parts[1];
      }
    }
    
    // Remove any query parameters
    filePath = filePath.split('?')[0];

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error(`Error creating signed URL for ${bucket}:`, error);
      return storedUrl; // Fall back to stored URL
    }

    return data.signedUrl;
  } catch (err) {
    console.error(`Error creating signed URL for ${bucket}:`, err);
    return storedUrl; // Fall back to stored URL
  }
}

/**
 * Hook to get multiple signed URLs at once
 * 
 * @param urls - Array of stored URLs or file paths
 * @param bucket - The storage bucket name
 * @param options - Optional configuration
 * @returns { signedUrls, isLoading, error }
 */
export function useSignedUrls(
  urls: (string | null | undefined)[],
  bucket: BucketName,
  options: UseSignedUrlOptions = {}
) {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { expiresIn = 3600 } = options;

  useEffect(() => {
    const validUrls = urls.filter((url): url is string => !!url);
    
    if (validUrls.length === 0) {
      setSignedUrls(new Map());
      return;
    }

    const fetchSignedUrls = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const urlMap = new Map<string, string>();

        await Promise.all(
          validUrls.map(async (url) => {
            const signedUrl = await getSignedUrl(url, bucket, expiresIn);
            if (signedUrl) {
              urlMap.set(url, signedUrl);
            }
          })
        );

        setSignedUrls(urlMap);
      } catch (err) {
        console.error(`Error creating signed URLs for ${bucket}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to create signed URLs'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrls();
  }, [JSON.stringify(urls), bucket, expiresIn]);

  const getUrl = useCallback((originalUrl: string | null | undefined): string | null => {
    if (!originalUrl) return null;
    return signedUrls.get(originalUrl) || originalUrl;
  }, [signedUrls]);

  return { signedUrls, getUrl, isLoading, error };
}
