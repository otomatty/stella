public class R2AcrossTests
{
    [Fact(DisplayName = "R2 二つの列")]
    public void R2Across()
    {
        Assert.Equal(2, Answers.R2Across(new int[] { 1, 4 }, new int[] { 2, 5 }, 6));
        Assert.Equal(1, Answers.R2Across(new int[] { 0 }, new int[] { 0 }, 0));
        Assert.Equal(0, Answers.R2Across(new int[] { 1, 2 }, new int[] { 3 }, 9));
        Assert.Equal(1, Answers.R2Across(new int[] { 5 }, new int[] { 1, 2, 3 }, 7));
    }
}
