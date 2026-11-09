public class Q24CountOddsTests
{
    [Fact(DisplayName = "Q24 奇数の個数")]
    public void Q24CountOdds()
    {
        Assert.Equal(3, Answers.Q24CountOdds(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.Q24CountOdds(new int[] { 2, 4 }));
        Assert.Equal(1, Answers.Q24CountOdds(new int[] { 7 }));
    }
}
