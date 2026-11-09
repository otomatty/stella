public class CheckASumAboveTests
{
    [Theory(DisplayName = "確認A kより大きい合計")]
    [InlineData("3 4\n2\n5\n8\n", "13\n")]
    [InlineData("0 0\n", "0\n")]
    [InlineData("1 4\n4\n", "0\n")]
    [InlineData("2 -3\n-2\n-4\n", "-2\n")]
    public void CheckASumAbove(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckASumAbove())));
    }
}
