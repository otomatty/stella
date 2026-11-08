public class Q30EitherOkTests
{
    [Theory(DisplayName = "Q30 または")]
    [InlineData(60, 10, "ok")]
    [InlineData(10, 60, "ok")]
    [InlineData(59, 59, "ng")]
    public void Q30EitherOk(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.Q30EitherOk(a, b));
    }
}
