public class CheckAPairsTests
{
    [Theory(DisplayName = "確認A 二品の組")]
    [InlineData("4 7\n1 3 4 8\n", "3\n7\n")]
    [InlineData("1 9\n2\n", "0\n-1\n")]
    [InlineData("3 4\n2 2 2\n", "3\n4\n")]
    public void CheckAPairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckAPairs())));
    }
}
