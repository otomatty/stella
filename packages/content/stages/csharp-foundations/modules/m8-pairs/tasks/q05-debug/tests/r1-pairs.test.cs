public class R1PairsTests
{
    [Fact(DisplayName = "R1 和がkの組")]
    public void R1Pairs()
    {
        Assert.Equal(2, Answers.R1Pairs(new int[] { 1, 2, 3, 4 }, 5));
        Assert.Equal(3, Answers.R1Pairs(new int[] { 2, 2, 2 }, 4));
        Assert.Equal(0, Answers.R1Pairs(new int[] { 5 }, 10));
        Assert.Equal(1, Answers.R1Pairs(new int[] { 0, 0 }, 0));
    }
}
