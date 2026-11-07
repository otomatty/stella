public class CheckBOnesTests
{
    [Theory(DisplayName = "確認B 全部1の行")]
    [InlineData("3 2\n1 1\n1 0\n1 1\n", "2\n")]
    [InlineData("1 1\n0\n", "0\n")]
    [InlineData("1 1\n1\n", "1\n")]
    public void CheckBOnes(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBOnes())));
    }
}
