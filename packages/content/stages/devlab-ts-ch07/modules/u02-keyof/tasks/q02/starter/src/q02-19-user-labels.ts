// 問19 型 UserLabels を、User のすべてのプロパティ名をキー、文字列を値にした型として作る（Record<keyof User, string>）。あわせて、その型の定数 USER_LABELS を export する（id は "ID"、name は "名前"、email は "メール"、age は "年齢"）

export type User = { id: number; name: string; email: string; age: number };

// ここに型 UserLabels と定数 USER_LABELS を書く
