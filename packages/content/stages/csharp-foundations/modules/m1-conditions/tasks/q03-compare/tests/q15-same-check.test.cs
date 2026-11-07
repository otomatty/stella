public class Q15SameCheckTests
{
    [Theory(DisplayName = "Q15 同じか")]
    [InlineData(4, 4, "eq")]
    [InlineData(4, 5, "ne")]
    [InlineData(0, 0, "eq")]
    public void Q15SameCheck(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.Q15SameCheck(a, b));
    }
}
