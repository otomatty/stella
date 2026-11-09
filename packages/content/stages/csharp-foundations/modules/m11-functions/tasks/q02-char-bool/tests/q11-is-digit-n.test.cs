public class Q11IsDigitNTests
{
    [Fact(DisplayName = "Q11 N桁の数字か")]
    public void Q11IsDigitN()
    {
        Assert.Equal(true, Answers.Q11IsDigitN("12345", 5));
        Assert.Equal(false, Answers.Q11IsDigitN("12345", 8));
        Assert.Equal(true, Answers.Q11IsDigitN("12345678", 8));
        Assert.Equal(false, Answers.Q11IsDigitN("", 8));
        Assert.Equal(false, Answers.Q11IsDigitN("1234567a", 8));
    }
}
