public class S01AcceptedTests
{
    [Theory(DisplayName = "S01 受け付けた注文")]
    [InlineData("8 4\n3\n6\n5\n1\n", "2\n0\n")]
    [InlineData("0 1\n0\n", "1\n0\n")]
    public void S01Accepted(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01Accepted())));
    }
}
