import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    toastOptions={{
      classNames: {
        toast:
          'bg-ink text-card border-ink shadow-lg rounded-md px-4 py-2.5 text-[13px] font-medium flex items-center gap-2',
      },
    }}
  />
);
