public class S04DuplicatesTests
{
    [Theory(DisplayName = "S04 重複")]
    [InlineData("5\n3 1 3 1 9\n", "1\n3\n")]
    [InlineData("3\n1 2 3\n", "none\n")]
    public void S04Duplicates(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04Duplicates())));
    }
}
