public class Q16SumOddsTests
{
    [Fact(DisplayName = "Q16 奇数の合計")]
    public void Q16SumOdds()
    {
        Assert.Equal(23, Answers.Q16SumOdds(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.Q16SumOdds(new int[] { 2, 4 }));
        Assert.Equal(7, Answers.Q16SumOdds(new int[] { 7 }));
    }
}
