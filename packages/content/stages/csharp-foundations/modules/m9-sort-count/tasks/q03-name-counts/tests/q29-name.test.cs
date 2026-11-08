public class Q29NameTests
{
    [Theory(DisplayName = "Q29 名前の件数")]
    [InlineData("3 3\nz\nz\nz\nz\nmissing\nz\n", "3\n0\n3\n")]
    public void Q29Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q29Name())));
    }
}
