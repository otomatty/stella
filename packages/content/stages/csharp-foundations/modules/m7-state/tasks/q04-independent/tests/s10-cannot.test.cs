public class S10CannotTests
{
    [Theory(DisplayName = "S10 使えなかった回数")]
    [InlineData("5 3\n6\n3\n3\n", "2\n")]
    [InlineData("5 1\n5\n", "0\n")]
    [InlineData("0 1\n0\n", "0\n")]
    public void S10Cannot(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10Cannot())));
    }
}
