public class R2LongestTests
{
    [Fact(DisplayName = "R2 連続する1")]
    public void R2Longest()
    {
        Assert.Equal(2, Answers.R2Longest(new int[] { 1, 1, 0, 1 }));
        Assert.Equal(0, Answers.R2Longest(new int[] { }));
        Assert.Equal(0, Answers.R2Longest(new int[] { 0, 0 }));
        Assert.Equal(3, Answers.R2Longest(new int[] { 1, 1, 1 }));
    }
}
