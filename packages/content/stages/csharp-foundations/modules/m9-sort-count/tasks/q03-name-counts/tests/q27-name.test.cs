public class Q27NameTests
{
    [Theory(DisplayName = "Q27 名前の件数")]
    [InlineData("3 3\nA\na\nA\nA\nmissing\nA\n", "2\n0\n2\n")]
    public void Q27Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q27Name())));
    }
}
