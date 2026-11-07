public class Q23CountEvensTests
{
    [Fact(DisplayName = "Q23 偶数の個数")]
    public void Q23CountEvens()
    {
        Assert.Equal(2, Answers.Q23CountEvens(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.Q23CountEvens(new int[] { 1, 3, 5 }));
        Assert.Equal(1, Answers.Q23CountEvens(new int[] { 8 }));
    }
}
