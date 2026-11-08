public class ConnectCountEvensTests
{
    [Fact(DisplayName = "接続 偶数の個数")]
    public void ConnectCountEvens()
    {
        Assert.Equal(2, Answers.ConnectCountEvens(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.ConnectCountEvens(new int[] { 1, 3, 5 }));
        Assert.Equal(4, Answers.ConnectCountEvens(new int[] { 2, 4, 6, 8 }));
    }
}
