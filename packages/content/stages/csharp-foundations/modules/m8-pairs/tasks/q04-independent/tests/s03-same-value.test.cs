public class S03SameValueTests
{
    [Theory(DisplayName = "S03 同じ値")]
    [InlineData("4\n2 2 3 2\n", "3\n")]
    [InlineData("3\n1 2 3\n", "0\n")]
    [InlineData("1\n1\n", "0\n")]
    public void S03SameValue(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03SameValue())));
    }
}
