public class Q15SumEvensTests
{
    [Fact(DisplayName = "Q15 偶数の合計")]
    public void Q15SumEvens()
    {
        Assert.Equal(10, Answers.Q15SumEvens(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.Q15SumEvens(new int[] { 1, 3 }));
        Assert.Equal(8, Answers.Q15SumEvens(new int[] { 8 }));
    }
}
