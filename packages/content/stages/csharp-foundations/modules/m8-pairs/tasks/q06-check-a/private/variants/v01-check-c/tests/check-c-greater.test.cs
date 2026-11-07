public class CheckCGreaterTests
{
    [Theory(DisplayName = "確認C Bが大きい組")]
    [InlineData("2 2\n2 5\n3 6\n", "3\n")]
    [InlineData("1 1\n4\n4\n", "0\n")]
    [InlineData("2 1\n2 2\n3\n", "2\n")]
    public void CheckCGreater(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckCGreater())));
    }
}
