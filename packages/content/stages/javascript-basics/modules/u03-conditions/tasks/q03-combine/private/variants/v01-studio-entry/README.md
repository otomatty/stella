# 録音室に入室できるか

`src/studio.js` の `canEnterStudio(isClosed, hasReservation, sessionMinutes)` を完成させます。`isClosed` は閉室中、`hasReservation` は予約済みを表す真偽値です。`sessionMinutes` は利用予定の分数で、1 以上の整数です。

閉室中なら先に `false` を返します。開室中で、予約済みかつ利用予定が 45 分以内なら `true`、それ以外なら `false` を返します。

例は `canEnterStudio(false, true, 45) → true` です。
