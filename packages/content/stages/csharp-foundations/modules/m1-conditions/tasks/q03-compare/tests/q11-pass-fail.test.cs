public class Q11PassFailTests
{
    [Theory(DisplayName = "Q11 合格点（以上）")]
    [InlineData(60, "pass")]
    [InlineData(59, "fail")]
    [InlineData(100, "pass")]
    public void Q11PassFail(int score, string expected)
    {
        Assert.Equal(expected, Answers.Q11PassFail(score));
    }
}
