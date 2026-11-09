public class R1RankTests
{
    [Fact(DisplayName = "R1 順位")]
    public void R1Rank()
    {
        Assert.Equal(5, Answers.R1Rank(new int[] { 8, 2, 5 }, 2));
        Assert.Equal(7, Answers.R1Rank(new int[] { 7 }, 1));
        Assert.Equal(4, Answers.R1Rank(new int[] { 4, 4, 1 }, 2));
        Assert.Equal(0, Answers.R1Rank(new int[] { 9, 0, 3, 8 }, 1));
    }
}
