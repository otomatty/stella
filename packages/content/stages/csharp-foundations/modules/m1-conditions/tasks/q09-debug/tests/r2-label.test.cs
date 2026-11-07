public class R2LabelTests
{
    [Theory(DisplayName = "R2")]
    [InlineData(6, "both")]
    [InlineData(8, "two")]
    [InlineData(9, "three")]
    [InlineData(5, "none")]
    public void R2Label(int n, string expected)
    {
        Assert.Equal(expected, Answers.R2Label(n));
    }
}
