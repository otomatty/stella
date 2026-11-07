public class Q06PassFailTests
{
    [Theory(DisplayName = "Q06 60以上なら pass")]
    [InlineData("60\n", "pass\n")]
    [InlineData("59\n", "fail\n")]
    [InlineData("100\n", "pass\n")]
    public void Q06PassFail(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q06PassFail())));
    }
}
