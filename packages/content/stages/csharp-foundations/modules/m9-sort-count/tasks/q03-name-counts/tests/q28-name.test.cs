public class Q28NameTests
{
    [Theory(DisplayName = "Q28 名前の件数")]
    [InlineData("2 3\npen\nbook\npen\nmissing\nbook\n", "1\n0\n1\n")]
    public void Q28Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q28Name())));
    }
}
