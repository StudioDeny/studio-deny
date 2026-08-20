import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  children?: React.ReactNode;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "CONFIRM", onConfirm, destructive, children }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-surface border-border rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-display text-2xl">{title}</AlertDialogTitle>
          {description && <AlertDialogDescription className="text-muted-foreground">{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none border-border text-mono text-[11px] tracking-widest">CANCEL</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-none text-mono text-[11px] tracking-widest ${destructive ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
