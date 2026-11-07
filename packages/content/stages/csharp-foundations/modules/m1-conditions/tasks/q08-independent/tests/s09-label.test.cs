public class S09LabelTests
{
    [Theory(DisplayName = "S09 整理札")]
    [InlineData(6, "both")]
    [InlineData(8, "two")]
    [InlineData(9, "three")]
    [InlineData(5, "none")]
    [InlineData(1, "none")]
    [InlineData(96, "both")]
    public void S09Label(int n, string expected)
    {
        Assert.Equal(expected, Answers.S09Label(n));
    }
}
