import { buildVscodeLessonUri } from "@falcon/shared";
import { Code } from "@/lib/icons";
import { Button } from "@/components/ui/button";

export function OpenInVscodeButton({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  return (
    <Button
      type="button"
      variant="accent"
      onClick={() => {
        location.assign(buildVscodeLessonUri(courseId, lessonId));
      }}
    >
      <Code size={14} />
      VS Code で開く
    </Button>
  );
}
