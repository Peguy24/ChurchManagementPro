import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

type BucketName = "member-photos" | "inventory-photos" | "member-documents";

interface SignedAvatarProps {
  storedUrl: string | null | undefined;
  bucket: BucketName;
  fallbackText: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * An Avatar component that automatically handles signed URLs for private storage buckets.
 * Use this instead of Avatar when displaying member photos from private storage.
 */
export function SignedAvatar({
  storedUrl,
  bucket,
  fallbackText,
  className,
  fallbackClassName,
}: SignedAvatarProps) {
  const { signedUrl } = useSignedUrl(storedUrl, bucket);

  return (
    <Avatar className={className}>
      <AvatarImage src={signedUrl || undefined} />
      <AvatarFallback className={fallbackClassName}>
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
