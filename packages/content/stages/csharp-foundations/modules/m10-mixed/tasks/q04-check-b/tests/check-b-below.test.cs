public class CheckBBelowTests
{
    [Theory(DisplayName = "確認B 基準未満")]
    [InlineData("6 5\n1 2 8 3 4 1\n", "3\n5\n")]
    [InlineData("2 5\n5 6\n", "0\n0\n")]
    [InlineData("1 5\n4\n", "1\n1\n")]
    public void CheckBBelow(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBBelow())));
    }
}
