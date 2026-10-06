// TODO: ページの題名 (title) を「ToDo」にする
export const metadata = {
  description: "Next.js の課題のひな形",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
