import { buildVscodeLessonUri } from "@falcon/shared";
import { toast } from "sonner";
import { Code } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useLearnerPreviewReadOnly } from "@/components/shell/app-shell-context";

export function OpenInVscodeButton({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const previewReadOnly = useLearnerPreviewReadOnly();
  return (
    <Button
      type="button"
      variant="accent"
      disabled={previewReadOnly}
      onClick={() => {
        if (previewReadOnly) {
          toast.message("受講者画面のプレビューでは VS Code を開けません");
          return;
        }
        location.assign(buildVscodeLessonUri(courseId, lessonId));
      }}
    >
      <Code size={14} />
      VS Code で開く
    </Button>
  );
}
