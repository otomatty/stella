public class R2CountTests
{
    [Fact(DisplayName = "R2 k以上の個数")]
    public void R2Count()
    {
        Assert.Equal(1, Answers.R2Count(new int[] { 5 }, 5));
        Assert.Equal(0, Answers.R2Count(new int[] { }, 5));
        Assert.Equal(3, Answers.R2Count(new int[] { 3, 9, 4, 11, 6 }, 6));
        Assert.Equal(0, Answers.R2Count(new int[] { 1, 2 }, 10));
    }
}
