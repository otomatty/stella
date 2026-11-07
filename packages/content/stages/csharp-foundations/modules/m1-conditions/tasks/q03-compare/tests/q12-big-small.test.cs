public class Q12BigSmallTests
{
    [Theory(DisplayName = "Q12 より大きい")]
    [InlineData(101, "big")]
    [InlineData(100, "small")]
    [InlineData(99, "small")]
    public void Q12BigSmall(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q12BigSmall(n));
    }
}
