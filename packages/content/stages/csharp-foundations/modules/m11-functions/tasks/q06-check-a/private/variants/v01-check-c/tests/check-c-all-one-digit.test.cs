public class CheckCAllOneDigitTests
{
    [Fact(DisplayName = "確認C 1桁だけ")]
    public void CheckCAllOneDigit()
    {
        Assert.Equal(true, Answers.CheckCAllOneDigit(new int[] { 0, 9 }));
        Assert.Equal(false, Answers.CheckCAllOneDigit(new int[] { 0, 10 }));
        Assert.Equal(false, Answers.CheckCAllOneDigit(new int[] { -1 }));
        Assert.Equal(true, Answers.CheckCAllOneDigit(new int[] { }));
    }
}
