import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type BucketName = "member-photos" | "inventory-photos" | "member-documents";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storedUrl: string | null | undefined;
  bucket: BucketName;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
}

/**
 * An image component that automatically handles signed URLs for private storage buckets.
 * Use this instead of <img> when displaying images from private storage.
 */
export function SignedImage({
  storedUrl,
  bucket,
  fallback,
  showSkeleton = true,
  className,
  alt,
  ...props
}: SignedImageProps) {
  const { signedUrl, isLoading } = useSignedUrl(storedUrl, bucket);

  if (!storedUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isLoading && showSkeleton) {
    return <Skeleton className={cn("rounded", className)} />;
  }

  if (!signedUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      {...props}
    />
  );
}

/**
 * Hook to get a signed image URL for use with Avatar components
 */
export function useSignedImageUrl(
  storedUrl: string | null | undefined,
  bucket: BucketName
): string | undefined {
  const { signedUrl } = useSignedUrl(storedUrl, bucket);
  return signedUrl || undefined;
}
