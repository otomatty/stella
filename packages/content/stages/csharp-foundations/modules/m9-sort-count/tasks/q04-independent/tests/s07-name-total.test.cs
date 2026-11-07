public class S07NameTotalTests
{
    [Theory(DisplayName = "S07 名前の合計")]
    [InlineData("3 2\npen 2\nbook 3\npen 4\npen\neraser\n", "6\n0\n")]
    public void S07NameTotal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07NameTotal())));
    }
}
