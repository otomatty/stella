public class Q19SignTests
{
    [Theory(DisplayName = "Q19 正負とゼロ")]
    [InlineData(-3, "negative")]
    [InlineData(0, "zero")]
    [InlineData(8, "positive")]
    public void Q19Sign(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q19Sign(n));
    }
}
